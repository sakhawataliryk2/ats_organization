import { NextRequest, NextResponse } from "next/server";

function isActionPage(urlPath: string): boolean {
  return (
    (urlPath.includes("/transfer/") &&
      (urlPath.includes("/approve") || urlPath.includes("/deny"))) ||
    (urlPath.includes("/delete/") &&
      (urlPath.includes("/approve") || urlPath.includes("/deny")))
  );
}

function getRedirectTarget(requestUrl: URL, redirectParam: string | null) {
  // Default landing page after auto-login
  let target = "/dashboard";

  if (!redirectParam) return target;

  try {
    const decoded = decodeURIComponent(redirectParam);

    // Only allow same-origin navigation. If redirect is an absolute URL,
    // we keep it only when origins match.
    let urlPath: string;
    if (decoded.startsWith("/")) {
      urlPath = decoded;
    } else {
      const abs = new URL(decoded, requestUrl);
      if (abs.origin !== requestUrl.origin) return target;
      urlPath = abs.pathname + abs.search;
    }

    if (isActionPage(urlPath)) return urlPath;
    return target;
  } catch {
    return target;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const originUrl = new URL(requestUrl.toString());

  const redirectParam = requestUrl.searchParams.get("redirect");
  const errorRedirectUrl = new URL("/auth/login?autologinError=1", request.url);
  const target = getRedirectTarget(originUrl, redirectParam);

  // Prefer env vars, but use hardcoded dev fallbacks to avoid "typo in env" issues.
  // (Do not use this in production.)
  const email = (process.env.AUTO_LOGIN_EMAIL || "owner@gmail.com").trim().toLowerCase();
  const password = process.env.AUTO_LOGIN_PASSWORD || "!2345678Aa";

  if (!email || !password) {
    const res = NextResponse.redirect(errorRedirectUrl);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  const apiUrl = process.env.API_BASE_URL || "http://localhost:8080";

  try {
    const backendResponse = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok || !data?.token) {
      const res = NextResponse.redirect(errorRedirectUrl);
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    if (data?.requires2FA) {
      const res = NextResponse.redirect(errorRedirectUrl);
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    if (data?.mustChangePassword) {
      const res = NextResponse.redirect(
        new URL("/auth/change-password?firstLogin=1", request.url)
      );
      res.headers.set("Cache-Control", "no-store");

      res.cookies.set("token", data.token, {
        maxAge: 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      const user = data.user || {};
      res.cookies.set(
        "user",
        JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType || user.user_type || user.role || "undefined",
        }),
        {
          maxAge: 60 * 60 * 24 * 7,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        }
      );

      return res;
    }

    const res = NextResponse.redirect(new URL(target, request.url));
    res.headers.set("Cache-Control", "no-store");

    res.cookies.set("token", data.token, {
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    const user = data.user || {};
    res.cookies.set(
      "user",
      JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType || user.user_type || user.role || "undefined",
      }),
      {
        maxAge: 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      }
    );

    return res;
  } catch {
    const res = NextResponse.redirect(errorRedirectUrl);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}


import { NextResponse } from "next/server";

const BLOCKED_COUNTRIES = [
  "US", // United States
  "KP", // North Korea
  "IR", // Iran
  "SY", // Syria
  "RU", // Russia
  "BY", // Belarus
  "CU", // Cuba
  "VE", // Venezuela
  "LY", // Libya
  "MM", // Myanmar
  "SD", // Sudan
  "SO", // Somalia
  "ZW", // Zimbabwe
  "CD", // Democratic Republic of the Congo
  "CF", // Central African Republic
  "IQ", // Iraq
  "LB", // Lebanon
  "YE", // Yemen
  "HT", // Haiti
  "ML", // Mali
];

export function middleware(req) {
  const country = req.geo?.country || "Unknown";
  if (BLOCKED_COUNTRIES.includes(country)) {
    return NextResponse.redirect(new URL("/blocked", req.url)); // Redirect to /blocked
  }
  return NextResponse.next(); // Proceed if not blocked
}

export const config = {
  matcher: "/", // Applies to the root page
};

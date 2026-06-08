"use client";

const MEMBER_STORAGE_KEY = "foundr1-member-profile";
const LANGUAGE_STORAGE_KEY = "nanacha-language";
const MEMBER_PORTAL_URL = process.env.NEXT_PUBLIC_FOUNDR1_MEMBER_URL || "https://foundr1.jp/member";
const MEMBER_BRAND = "nanacha";
const SUPPORTED_LANGUAGES = ["ja", "en", "zh", "ko", "vi", "ne"];

export function normalizeMemberLanguage(value) {
  const language = String(value || "").trim();
  return SUPPORTED_LANGUAGES.includes(language) ? language : "";
}

export function memberPreferredLanguage(profile) {
  return normalizeMemberLanguage(profile?.preferredLanguage || profile?.language || profile?.selectedLanguage);
}

function currentLanguage() {
  if (typeof window === "undefined") return "ja";
  try {
    const stored = normalizeMemberLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Fall back below.
  }
  const htmlLanguage = normalizeMemberLanguage(document.documentElement.lang);
  return htmlLanguage || "ja";
}

function cleanReturnUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("memberHandoff");
  url.searchParams.delete("memberSignedOut");
  return url.toString();
}

function buildMemberUrl({ handoff }) {
  if (typeof window === "undefined") return MEMBER_PORTAL_URL;
  const url = new URL(MEMBER_PORTAL_URL);
  url.searchParams.set("returnTo", cleanReturnUrl());
  url.searchParams.set("lang", currentLanguage());
  if (handoff) url.searchParams.set("handoff", "1");
  return url.toString();
}

export function buildMemberCardUrl() {
  return buildMemberUrl({ handoff: false });
}

export function buildMemberHandoffUrl() {
  return buildMemberUrl({ handoff: true });
}

export function getStoredMemberProfile() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MEMBER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function refreshStoredMemberProfile(profile) {
  if (!profile?.publicToken) return profile;
  try {
    const response = await fetch(`/api/member-handoff?memberToken=${encodeURIComponent(profile.publicToken)}&brand=${encodeURIComponent(MEMBER_BRAND)}`, {
      cache: "no-store"
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body?.member) return profile;
    const nextProfile = { ...body.member, coupons: Array.isArray(body.coupons) ? body.coupons : [] };
    window.localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(nextProfile));
    return nextProfile;
  } catch {
    return profile;
  }
}

export async function consumeMemberHandoff() {
  if (typeof window === "undefined") return getStoredMemberProfile();

  const url = new URL(window.location.href);
  if (url.searchParams.get("memberSignedOut") === "1") {
    window.localStorage.removeItem(MEMBER_STORAGE_KEY);
    url.searchParams.delete("memberSignedOut");
    window.history.replaceState({}, "", url.toString());
    return null;
  }

  const token = url.searchParams.get("memberHandoff");
  if (!token) return refreshStoredMemberProfile(getStoredMemberProfile());

  url.searchParams.delete("memberHandoff");
  window.history.replaceState({}, "", url.toString());

  const response = await fetch(`/api/member-handoff?token=${encodeURIComponent(token)}&brand=${encodeURIComponent(MEMBER_BRAND)}`, {
    cache: "no-store"
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.member) throw new Error(body?.error || "会員情報を読み込めませんでした。");

  const profile = { ...body.member, coupons: Array.isArray(body.coupons) ? body.coupons : [] };
  window.localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

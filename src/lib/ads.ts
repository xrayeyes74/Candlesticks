import { Capacitor } from "@capacitor/core";

// Google's official TEST banner ad unit — ALWAYS use this while developing/testing
// the app, even after you have real AdMob IDs. Clicking or generating traffic on
// your own real ad unit during testing is an AdMob policy violation that can get
// the account suspended. Only flip USE_PROD_ADS to true for the final release
// build you upload to Google Play — never during day-to-day testing.
const TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
const PROD_BANNER_ID = "ca-app-pub-6563232891529127/5877247822";

const USE_PROD_ADS = false; // ⚠️ flip to true ONLY for the Play Store release build

let started = false;

export async function initAds() {
  if (started) return;
  if (!Capacitor.isNativePlatform()) return; // no ads on the plain website, only inside the app
  started = true;
  try {
    const { AdMob, BannerAdPosition, BannerAdSize } = await import("@capacitor-community/admob");
    await AdMob.initialize({ initializeForTesting: !USE_PROD_ADS });
    await AdMob.showBanner({
      adId: USE_PROD_ADS ? PROD_BANNER_ID : TEST_BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: !USE_PROD_ADS,
    });
  } catch (err) {
    // Never let an ad failure break the app itself.
    console.warn("AdMob init failed", err);
  }
}

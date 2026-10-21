import { Alert, Linking } from 'react-native';
import { getSetting, setSetting } from './database';

export const APP_VERSION = '0.6.0-beta';
const GITHUB_TAGS_URL = 'https://api.github.com/repos/sunilsankar/DivYield/tags?per_page=5';
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/sunilsankar/DivYield/releases?per_page=5';
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours throttle

export interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion: string;
  releaseUrl: string;
  downloadUrl: string;
}

export function isNewerVersion(current: string, latest: string): boolean {
  // ponytail: minimal semver comparison, upgrade to semver library if complex prerelease rules needed
  const parse = (v: string) => {
    const clean = v.replace(/^[vV]/, '').replace(/^beta-/, '');
    const [numPart, prePart] = clean.split('-');
    const nums = numPart.split('.').map(n => parseInt(n, 10) || 0);
    while (nums.length < 3) nums.push(0);
    return { nums, pre: prePart || '' };
  };

  const c = parse(current);
  const l = parse(latest);

  for (let i = 0; i < 3; i++) {
    if (l.nums[i] > c.nums[i]) return true;
    if (l.nums[i] < c.nums[i]) return false;
  }

  // If major.minor.patch are equal:
  // Non-prerelease is newer than prerelease (e.g. 0.5.0 vs 0.5.0-beta)
  if (c.pre && !l.pre) return true;
  if (!c.pre && l.pre) return false;
  if (c.pre && l.pre && c.pre !== l.pre) {
    return l.pre.localeCompare(c.pre) > 0;
  }
  return false;
}

export async function checkGitHubRelease(currentVersion: string = APP_VERSION): Promise<UpdateInfo | null> {
  try {
    let latestTag = '';
    let releaseUrl = '';
    let downloadUrl = '';

    // Check tags first to query the newest tag directly
    const tagsRes = await fetch(GITHUB_TAGS_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DivYield-Mobile',
      },
    });

    if (tagsRes.ok) {
      const tags = await tagsRes.json();
      if (Array.isArray(tags) && tags.length > 0) {
        latestTag = tags[0].name || '';
      }
    }

    // Also inspect releases for explicit APK asset metadata
    try {
      const relRes = await fetch(GITHUB_RELEASES_URL, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DivYield-Mobile',
        },
      });
      if (relRes.ok) {
        const releases = await relRes.json();
        if (Array.isArray(releases) && releases.length > 0) {
          if (!latestTag) {
            latestTag = releases[0].tag_name || '';
          }
          const matchedRel = releases.find((r: any) => r.tag_name === latestTag) || releases[0];
          releaseUrl = matchedRel.html_url || '';
          const apkAsset = matchedRel.assets?.find((a: any) =>
            typeof a.name === 'string' && a.name.endsWith('.apk')
          );
          if (apkAsset?.browser_download_url) {
            downloadUrl = apkAsset.browser_download_url;
          }
        }
      }
    } catch {
      // Ignore release metadata fetch failure if tags succeeded
    }

    if (!latestTag) return null;

    if (!releaseUrl) {
      releaseUrl = `https://github.com/sunilsankar/DivYield/releases/tag/${latestTag}`;
    }
    if (!downloadUrl) {
      downloadUrl = `https://github.com/sunilsankar/DivYield/releases/download/${latestTag}/DivYield-Android.apk`;
    }

    const updateAvailable = isNewerVersion(currentVersion, latestTag);

    return {
      updateAvailable,
      latestVersion: latestTag,
      releaseUrl,
      downloadUrl,
    };
  } catch {
    return null;
  }
}

export function promptForUpdate(info: UpdateInfo): void {
  // ponytail: opens browser/system download manager for APK; upgrade to in-app package installer if auto-install without browser is required
  const targetUrl = info.downloadUrl || info.releaseUrl;
  Alert.alert(
    'Update Available',
    `A new version of DivYield (${info.latestVersion}) is available.\n\nWould you like to download the update?`,
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Download',
        onPress: () => {
          Linking.openURL(targetUrl).catch(() => {
            Linking.openURL(info.releaseUrl);
          });
        },
      },
    ]
  );
}

export async function checkAppUpdateSilently(): Promise<void> {
  try {
    const lastCheckStr = await getSetting('last_update_check', '0');
    const lastCheck = parseInt(lastCheckStr, 10) || 0;
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) {
      return;
    }

    await setSetting('last_update_check', String(Date.now()));
    const info = await checkGitHubRelease();
    if (info?.updateAvailable) {
      promptForUpdate(info);
    }
  } catch {
    // Fail silently on background check
  }
}

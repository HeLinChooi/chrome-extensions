/** The filter lists. The id is also the static ruleset id in manifest.json. */
export const LISTS = [
  { id: 'easylist', name: 'Ads', source: 'EasyList', url: 'https://easylist.to/easylist/easylist.txt' },
  { id: 'easyprivacy', name: 'Trackers', source: 'EasyPrivacy', url: 'https://easylist.to/easylist/easyprivacy.txt' },
  {
    id: 'cookies',
    name: 'Cookie banners',
    source: 'EasyList Cookie List',
    url: 'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt',
  },
];

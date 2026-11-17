export const languages = {
  el: 'Ελληνικά',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'el';

export const ui = {
  el: {
    'site.title': 'Στάσεις Λεωφορείων Ηρακλείου',
    'site.description': 'Χάρτης και λίστα με όλες τις στάσεις λεωφορείων του Ηρακλείου.',
    'home.heading': 'Στάσεις λεωφορείων',
    'search.label': 'Αναζήτηση στάσης',
    'search.placeholder': 'Αναζήτηση με όνομα ή κωδικό…',
    'list.count': '{count} στάσεις',
    'list.empty': 'Δεν βρέθηκαν στάσεις.',
    'stop.code': 'Κωδικός',
    'stop.lines': 'Γραμμές',
    'map.label': 'Χάρτης στάσεων',
    'lang.switch': 'Γλώσσα',
  },
  en: {
    'site.title': 'Heraklion Bus Stops',
    'site.description': 'Map and list of all bus stops in Heraklion.',
    'home.heading': 'Bus stops',
    'search.label': 'Search stops',
    'search.placeholder': 'Search by name or code…',
    'list.count': '{count} stops',
    'list.empty': 'No stops found.',
    'stop.code': 'Code',
    'stop.lines': 'Lines',
    'map.label': 'Stops map',
    'lang.switch': 'Language',
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type UiKey = keyof (typeof ui)[typeof defaultLang];

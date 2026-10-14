// Bible version definitions — all files served from public/bible/
export const BIBLE_VERSIONS = [
  {
    id: 'tamil',
    label: 'Tamil',
    shortLabel: 'Tamil',
    lang: 'ta',
    file: './bible/tamil.xml',
    format: 'xml-zefania',
  },
  {
    id: 'english-kjv',
    label: 'English KJV',
    shortLabel: 'KJV',
    lang: 'en',
    file: './bible/kjv.json',
    format: 'json-books',
  },
  {
    id: 'english-nkjv',
    label: 'English NKJV',
    shortLabel: 'NKJV',
    lang: 'en',
    file: './bible/nkjv.xml',
    format: 'xml-nkjv',
  },
];

export const getVersionById = (id) =>
  BIBLE_VERSIONS.find((v) => v.id === id || (id === 'tamil-bsi' && v.id === 'tamil')) || BIBLE_VERSIONS[0];


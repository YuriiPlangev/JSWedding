import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        'branch': ['Branch', 'system-ui', 'sans-serif'],
        'gilroy': ['Gilroy', 'system-ui', 'sans-serif'],
        'lovelace': ['Lovelace', 'serif'],
        'forum': ['Forum', 'system-ui', 'serif'],
        'sloop': ['Sloop Script Three', 'system-ui', 'serif'],
        'anastasia': ['AnastasiaScript Regular', 'system-ui', 'serif'],
      },
    },
  },
}

export default config


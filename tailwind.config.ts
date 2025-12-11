import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        'branch': ['Branch', 'system-ui', 'sans-serif'],
        'gilroy': ['Gilroy', 'system-ui', 'sans-serif'],
        'lovelace': ['Lovelace', 'serif'],
      },
    },
  },
}

export default config


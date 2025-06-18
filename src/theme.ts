import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  fonts: {
    heading: "'Varela Round', sans-serif",
    body: "'Varela Round', sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: '#FBF6F0',
      }
    }
  },
  colors: {
    blue: {
      500: "#3674B5",
    },
    background: {
      primary: "#FBF6F0"
    }
  },
  components: {
    Button: {
      variants: {
        ghost: {
          _hover: {
            bg: "#E8EEF2",
          },
        },
      },
    },
  },
});

export default theme; 
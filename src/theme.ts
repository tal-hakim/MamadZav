import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  fonts: {
    heading: "'Varela Round', sans-serif",
    body: "'Varela Round', sans-serif",
  },
  colors: {
    blue: {
      500: "#3674B5",
    },
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
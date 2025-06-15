import { ChakraProvider } from '@chakra-ui/react';
import { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import theme from '../theme';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default MyApp; 
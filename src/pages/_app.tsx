import { ChakraProvider, CSSReset } from '@chakra-ui/react';
import { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <CSSReset />
      <AuthProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default MyApp; 
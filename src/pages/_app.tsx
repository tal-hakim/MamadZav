import { ChakraProvider, Box } from '@chakra-ui/react';
import { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import theme from '../theme';
import ErrorBoundary from '@/components/ErrorBoundary';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <Box minH="100vh" bg="background.primary">
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </Box>
        </AuthProvider>
      </ChakraProvider>
    </ErrorBoundary>
  );
}

export default MyApp; 
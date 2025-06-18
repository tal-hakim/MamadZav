import { NextPageContext } from 'next';
import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';

interface Props {
  statusCode?: number;
  message?: string;
}

function Error({ statusCode, message }: Props) {
  const router = useRouter();

  return (
    <Box p={8}>
      <VStack spacing={4} align="stretch">
        <Heading color="red.500">
          {statusCode
            ? `An error ${statusCode} occurred on server`
            : 'An error occurred on client'}
        </Heading>
        {message && (
          <Text color="red.800">{message}</Text>
        )}
        <Button
          onClick={() => router.push('/')}
          colorScheme="blue"
          width="fit-content"
        >
          Go back home
        </Button>
      </VStack>
    </Box>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  const message = err?.message || 'Something went wrong';
  return { statusCode, message };
};

export default Error; 
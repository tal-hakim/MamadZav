import { Box, Text } from '@chakra-ui/react';
import { useMemo } from 'react';

interface ColorPair {
  bg: string;
  fg: string;
}

const COLOR_PAIRS: ColorPair[] = [
  { bg: "#C9E9D2", fg: "#2F4F2F" }, // Mint Green
  { bg: "#C0C9EE", fg: "#2F2F4F" }, // Lavender Blue
  { bg: "#FFB38E", fg: "#8B4513" }, // Peach
  { bg: "#BBE9FF", fg: "#2B5797" }, // Sky Blue
  { bg: "#F7B5CA", fg: "#8B2F47" }, // Cotton Candy
  { bg: "#FDFFAB", fg: "#8B7500" }, // Lemon Chiffon
];

interface ProfileCircleProps {
  name: string;
  size?: string;
  fontSize?: string;
}

export default function ProfileCircle({ name, size = "40px", fontSize = "16px" }: ProfileCircleProps) {
  // Generate initials from name
  const initials = useMemo(() => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [name]);

  // Generate consistent color based on name
  const colorPair = useMemo(() => {
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % COLOR_PAIRS.length;
    return COLOR_PAIRS[index];
  }, [name]);

  return (
    <Box
      bg={colorPair.bg}
      color={colorPair.fg}
      width={size}
      height={size}
      borderRadius="50%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontWeight="bold"
      fontSize={fontSize}
      border="2px solid"
      borderColor={colorPair.fg}
      flexShrink={0}
    >
      <Text>{initials}</Text>
    </Box>
  );
} 
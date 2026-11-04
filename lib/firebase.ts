import { getAuth, type User } from '@react-native-firebase/auth';

export const auth = getAuth();

export type { User };

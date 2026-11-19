import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(10).max(128),
});
export type SignUpDto = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});
export type SignInDto = z.infer<typeof signInSchema>;

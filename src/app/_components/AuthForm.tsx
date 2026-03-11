"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import {
  Paper,
  Tabs,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Group,
  Divider,
  Text,
  Alert,
  Checkbox,
  Progress,
  Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconBrandDiscord,
  IconBrandGoogle,
  IconCheck,
  IconAlertCircle,
  IconMail,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface AuthFormProps {
  callbackUrl?: string;
  className?: string;
  initialValues?: {
    firstName?: string;
    email?: string;
  };
}

interface SignInFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface SignUpFormData {
  firstName: string;
  surname: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 25;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 25;
  return Math.min(strength, 100);
}

function getPasswordStrengthColor(strength: number): string {
  if (strength < 50) return "red";
  if (strength < 75) return "yellow";
  return "green";
}

export default function AuthForm({
  callbackUrl,
  className,
  initialValues,
}: AuthFormProps) {
  const [activeTab, setActiveTab] = useState<string | null>("signup");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const createUserMutation = api.user.create.useMutation();

  // Preserve late pass from URL parameters in client-side cookie
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const latePass = urlParams.get("latePass");

      if (latePass) {
        // Set client-side cookie to persist late pass through auth flow
        document.cookie = `ftc-late-pass=${latePass}; path=/; max-age=${24 * 60 * 60}; samesite=lax${process.env.NODE_ENV === "production" ? "; secure" : ""}`;
      }
    }
  }, []);

  const signInForm = useForm<SignInFormData>({
    initialValues: {
      email: initialValues?.email ?? "",
      password: "",
      rememberMe: false,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => (value.length > 0 ? null : "Password is required"),
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    initialValues: {
      firstName: initialValues?.firstName ?? "",
      surname: "",
      email: initialValues?.email ?? "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
    validate: {
      firstName: (value) =>
        value.length < 1 ? "First name is required" : null,
      surname: () => null, // Optional field
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => {
        if (value.length < 8) return "Password must be at least 8 characters";
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return "Password must contain uppercase, lowercase, and number";
        }
        return null;
      },
      confirmPassword: (value, values) =>
        value !== values.password ? "Passwords do not match" : null,
      agreeToTerms: (value) => (value ? null : "You must agree to the terms"),
    },
  });

  const handleSignIn = async (values: SignInFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: callbackUrl ?? "/dashboard",
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.url) {
        setSuccess("Sign in successful! Redirecting...");
        window.location.href = result.url;
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (values: SignUpFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await createUserMutation.mutateAsync({
        firstName: values.firstName,
        surname: values.surname,
        email: values.email,
        password: values.password,
      });

      // Invitations are accepted automatically in the signIn callback
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: callbackUrl ?? "/dashboard",
      });

      if (result?.error) {
        setError(
          "Account created but sign in failed. Please try signing in manually.",
        );
      } else if (result?.url) {
        setSuccess("Account created successfully! Redirecting...");
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkSignIn = async () => {
    if (!magicLinkEmail || !/^\S+@\S+$/.test(magicLinkEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("postmark", {
        email: magicLinkEmail,
        redirect: false,
        callbackUrl: callbackUrl ?? "/dashboard",
      });

      if (result?.error) {
        setError("Failed to send sign-in link. Please try again.");
      } else {
        setMagicLinkSent(true);
        setSuccess("Check your email for a sign-in link!");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: "discord" | "google") => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn(provider, {
        callbackUrl: callbackUrl ?? "/dashboard",
      });
    } catch {
      setError("Failed to sign in with provider");
      setIsLoading(false);
    }
  };

  return (
    <Paper className={className} radius="md" p="xl" withBorder>
      <Stack gap="md">
        {/* Header */}
        <div>
          <Text size="xl" fw={600} ta="center">
            {activeTab === "signin" ? "Welcome Back" : "Join the Commons"}
          </Text>
          <Text size="sm" c="dimmed" ta="center" mt="xs">
            {activeTab === "signin"
              ? "Sign in to continue your journey"
              : "Create your account to get started"}
          </Text>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert color="green" icon={<IconCheck size={16} />}>
            {success}
          </Alert>
        )}

        {/* Auth Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="signup">Join the Commons</Tabs.Tab>
            <Tabs.Tab value="signin">Sign In</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="signin" mt="sm">
            {magicLinkSent ? (
              <Stack gap="sm" align="center" py="md">
                <IconMail size={48} color="var(--mantine-color-blue-6)" />
                <Text fw={600} size="lg">
                  Check your email
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  We sent a sign-in link to <strong>{magicLinkEmail}</strong>.
                  Click the link in the email to sign in.
                </Text>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    setMagicLinkSent(false);
                    setSuccess(null);
                  }}
                >
                  Try a different method
                </Button>
              </Stack>
            ) : magicLinkMode ? (
              <Stack gap="sm">
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  value={magicLinkEmail}
                  onChange={(e) => setMagicLinkEmail(e.currentTarget.value)}
                  required
                  leftSection={<IconMail size={16} />}
                />
                <Button
                  onClick={() => void handleMagicLinkSignIn()}
                  loading={isLoading}
                  fullWidth
                  leftSection={<IconMail size={18} />}
                >
                  Send Sign-In Link
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => setMagicLinkMode(false)}
                  fullWidth
                >
                  Sign in with password instead
                </Button>

                <Divider label="Or continue with" labelPosition="center" />

                <Stack gap="xs">
                  <Button
                    variant="outline"
                    leftSection={<IconBrandDiscord size={18} />}
                    onClick={() => handleProviderSignIn("discord")}
                    loading={isLoading}
                    fullWidth
                  >
                    Continue with Discord
                  </Button>
                  <Button
                    variant="outline"
                    leftSection={<IconBrandGoogle size={18} />}
                    onClick={() => handleProviderSignIn("google")}
                    loading={isLoading}
                    fullWidth
                  >
                    Continue with Google
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <form onSubmit={signInForm.onSubmit(handleSignIn)}>
                <Stack gap="sm">
                  <TextInput
                    label="Email"
                    placeholder="your@email.com"
                    required
                    {...signInForm.getInputProps("email")}
                  />
                  <PasswordInput
                    label="Password"
                    placeholder="Your password"
                    required
                    {...signInForm.getInputProps("password")}
                  />
                  <Group justify="space-between">
                    <Checkbox
                      label="Remember me"
                      size="sm"
                      {...signInForm.getInputProps("rememberMe", {
                        type: "checkbox",
                      })}
                    />
                    <Anchor size="xs" href="/auth/forgot-password">
                      Forgot password?
                    </Anchor>
                  </Group>
                  <Button type="submit" loading={isLoading} fullWidth>
                    Sign In
                  </Button>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => setMagicLinkMode(true)}
                    fullWidth
                    leftSection={<IconMail size={16} />}
                  >
                    Sign in with email link instead
                  </Button>

                  <Divider label="Or continue with" labelPosition="center" />

                  <Stack gap="xs">
                    <Button
                      variant="outline"
                      leftSection={<IconBrandDiscord size={18} />}
                      onClick={() => handleProviderSignIn("discord")}
                      loading={isLoading}
                      fullWidth
                    >
                      Continue with Discord
                    </Button>
                    <Button
                      variant="outline"
                      leftSection={<IconBrandGoogle size={18} />}
                      onClick={() => handleProviderSignIn("google")}
                      loading={isLoading}
                      fullWidth
                    >
                      Continue with Google
                    </Button>
                  </Stack>
                </Stack>
              </form>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="signup" mt="sm">
            <form onSubmit={signUpForm.onSubmit(handleSignUp)}>
              <Stack gap="sm">
                <Group grow>
                  <TextInput
                    label="First Name"
                    placeholder="John"
                    required
                    {...signUpForm.getInputProps("firstName")}
                  />
                  <TextInput
                    label="Surname"
                    placeholder="Doe"
                    {...signUpForm.getInputProps("surname")}
                  />
                </Group>
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  required
                  {...signUpForm.getInputProps("email")}
                />
                <div>
                  <PasswordInput
                    label="Password"
                    placeholder="Create a password"
                    required
                    {...signUpForm.getInputProps("password")}
                  />
                  {signUpForm.values.password && (
                    <div>
                      <Text size="xs" c="dimmed" mt="xs">
                        Password strength
                      </Text>
                      <Progress
                        value={getPasswordStrength(signUpForm.values.password)}
                        color={getPasswordStrengthColor(
                          getPasswordStrength(signUpForm.values.password),
                        )}
                        size="sm"
                        mt="xs"
                      />
                    </div>
                  )}
                </div>
                <PasswordInput
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  required
                  {...signUpForm.getInputProps("confirmPassword")}
                />
                <Checkbox
                  size="sm"
                  label={
                    <Text size="sm">
                      I agree to the{" "}
                      <Anchor href="/terms" target="_blank" size="sm">
                        Terms of Service
                      </Anchor>{" "}
                      and{" "}
                      <Anchor href="/privacy" target="_blank" size="sm">
                        Privacy Policy
                      </Anchor>
                    </Text>
                  }
                  required
                  {...signUpForm.getInputProps("agreeToTerms", {
                    type: "checkbox",
                  })}
                />
                <Button type="submit" loading={isLoading} fullWidth>
                  Create Account
                </Button>

                <Divider label="Or continue with" labelPosition="center" />

                <Stack gap="xs">
                  <Button
                    variant="outline"
                    leftSection={<IconBrandDiscord size={18} />}
                    onClick={() => handleProviderSignIn("discord")}
                    loading={isLoading}
                    fullWidth
                  >
                    Continue with Discord
                  </Button>
                  <Button
                    variant="outline"
                    leftSection={<IconBrandGoogle size={18} />}
                    onClick={() => handleProviderSignIn("google")}
                    loading={isLoading}
                    fullWidth
                  >
                    Continue with Google
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>

        {/* Footer */}
        <Text size="xs" c="dimmed" ta="center">
          {activeTab === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <Anchor onClick={() => setActiveTab("signup")}>
                Join the Commons
              </Anchor>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Anchor onClick={() => setActiveTab("signin")}>Sign in</Anchor>
            </>
          )}
        </Text>
      </Stack>
    </Paper>
  );
}

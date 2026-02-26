import { GenericErrorBoundary } from "@/components/errors/GenericErrorBoundary";

export default function OnboardingError(props: { error: Error; reset: () => void }) {
  return <GenericErrorBoundary {...props} />;
}

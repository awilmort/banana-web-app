import AdminLoginPage from '@/components/auth/AdminLoginPage';

type LoginPageProps = {
  searchParams?: Promise<{ next?: string | string[] }> | { next?: string | string[] };
};

const isSafeAdminRedirect = (path: string) => /^\/admin(?:[/?#]|$)/.test(path);

const resolveRedirectTarget = (nextValue?: string | string[]) => {
  const requestedNext = Array.isArray(nextValue) ? nextValue[0] : nextValue;
  return requestedNext && isSafeAdminRedirect(requestedNext) ? requestedNext : '/admin';
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const redirectTarget = resolveRedirectTarget(resolvedSearchParams?.next);

  return <AdminLoginPage redirectTarget={redirectTarget} />;
}

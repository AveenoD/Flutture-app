export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Login layout doesn't need Sidebar/Topbar, so just return children
  // Root layout will handle the html/body structure
  return <>{children}</>;
}

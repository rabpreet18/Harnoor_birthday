export const metadata = {
  title: "Birthday 3D",
  description: "Interactive 3D birthday celebration"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Pleadex",
	description: "Your legal case management system",
	icons: {
		icon: [
			{ url: "/images/Pleadex-Logo.svg", sizes: "32x32", type: "image/svg+xml" },
			{ url: "/images/Pleadex-Logo.svg", sizes: "16x16", type: "image/svg+xml" },
		],
		apple: [
			{ url: "/images/Pleadex-Logo.svg", sizes: "180x180", type: "image/svg+xml" },
		],
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" data-theme="light">
			<head>
				<link rel="icon" type="image/svg+xml" href="/images/Pleadex-Logo.svg" />
				<link rel="apple-touch-icon" href="/images/Pleadex-Logo.svg" />
			</head>
			<body className={inter.className}>
				<Providers>
					{children}
				</Providers>
			</body>
		</html>
	);
}

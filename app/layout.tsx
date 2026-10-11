import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata={title:"Z6PD | Department Management",description:"Zone6 Police Department management system"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

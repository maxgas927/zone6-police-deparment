import "./globals.css";
import type {Metadata,Viewport} from "next";
import AutoDiscordSync from "./AutoDiscordSync";

export const metadata:Metadata={title:{default:"Z6PD | Command Center",template:"%s | Z6PD"},description:"Secure Zone6 Police Department command, personnel and Discord management system",applicationName:"Z6PD Command Center"};
export const viewport:Viewport={themeColor:"#07101d"};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><AutoDiscordSync/>{children}<footer className="sitefooter"><b>Developed by Armstrong</b><span>© 2026 Zone6 Police Department. All rights reserved.</span></footer></body></html>;
}

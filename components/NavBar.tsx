"use client";

import {
  Link,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/react";
import { GithubIcon, HeyGenLogo } from "./Icons";
import { ThemeSwitch } from "./ThemeSwitch";

export default function NavBar() {
  return (
    
        <div className="bg-gradient-to-br from-sky-300 to-indigo-500 bg-clip-text ml-0 text-center flex items-center justify-center">
          <p className="text-2xl font-semibold text-transparent text-center py-2">
            Edulytics
          </p>
        </div>
  );
}

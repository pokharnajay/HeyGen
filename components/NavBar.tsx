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
    <Navbar className="w-screen">
      <NavbarBrand className="flex items-center justify-center">
        <div className="bg-gradient-to-br from-sky-300 to-indigo-500 bg-clip-text ml-0 text-center flex items-center justify-center">
          <p className="text-2xl font-semibold text-transparent text-center">
            Edulytics
          </p>
        </div>
      </NavbarBrand>
      {/* <NavbarContent justify="center">
        <NavbarItem className="flex flex-row items-center gap-4">
          <Link
            isExternal
            color="foreground"
            href="https://labs.heygen.com/interactive-avatar"
          >
            Avatars
          </Link>
          <Link
            isExternal
            color="foreground"
            href="https://docs.heygen.com/reference/list-voices-v2"
          >
            Voices
          </Link>
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent> */}
    </Navbar>
  );
}

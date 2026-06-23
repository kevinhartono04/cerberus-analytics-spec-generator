import { describe, expect, it } from "vitest";

import { configuredRoleForEmail, isAllowedAuthEmail } from "@/lib/auth-policy";

describe("Auth.js sign-in policy", () => {
  it("allows Tripledot Google accounts", () => {
    expect(isAllowedAuthEmail("kevin.hartono@tripledotstudios.com")).toBe(true);
    expect(isAllowedAuthEmail("USER@TRIPLEDOTSTUDIOS.COM")).toBe(true);
  });

  it("rejects non-Tripledot accounts", () => {
    expect(isAllowedAuthEmail("person@example.com")).toBe(false);
    expect(isAllowedAuthEmail(null)).toBe(false);
  });

  it("assigns configured roles by email", () => {
    const options = {
      adminEmails: "kevin.hartono@tripledotstudios.com",
      editorEmails: "oscar.mckittrick@tripledotstudios.com, artem.chupryna@tripledotstudios.com",
    };

    expect(configuredRoleForEmail("kevin.hartono@tripledotstudios.com", options)).toBe("admin");
    expect(configuredRoleForEmail("oscar.mckittrick@tripledotstudios.com", options)).toBe("editor");
    expect(configuredRoleForEmail("ARTEM.CHUPRYNA@TRIPLEDOTSTUDIOS.COM", options)).toBe("editor");
    expect(configuredRoleForEmail("someone.else@tripledotstudios.com", options)).toBe("viewer");
  });
});

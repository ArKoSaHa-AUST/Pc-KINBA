# Security Policy

## Supported Versions

We actively maintain and support security patches for the following versions of the PCBuilder Bangladesh platform:

| Version | Supported | Notes |
| :--- | :--- | :--- |
| 1.x.x | :white_check_mark: Yes | Current production-grade release |
| < 1.0.0 | :x: No | Initial bootstrapping and draft releases |

---

## Reporting a Vulnerability

We take the security of the PCBuilder Bangladesh platform seriously. If you find any vulnerabilities or security concerns (e.g., exposed keys, SQL injections, authorization bypasses, cache poisoning), please follow these guidelines:

1.  **Do NOT open a public GitHub issue.** This exposes the vulnerability to exploitation.
2.  Email your findings directly to the lead security maintainer at **arkosaha61005@gmail.com**.
3.  Include a detailed description of the vulnerability, steps to reproduce (or a proof-of-concept exploit), and potential remediation recommendations.

---

## Our Disclosure Process

Upon receiving a vulnerability report:

*   We will acknowledge receipt of the report within **48 hours**.
*   We will evaluate the threat severity and work on a fix in a private branch.
*   Once resolved, we will merge the fix to `main`, tag a security release, and credit the reporter (unless anonymity is requested).
*   Our target timeline from initial report to public release/disclosure is **30 days**.

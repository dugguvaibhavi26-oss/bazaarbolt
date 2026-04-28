"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TermsPage() {
  const pathname = usePathname();

  return (
    <div className="legal-container">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
            --primary-green: #0c831f;
            --light-green: #e9f5ea;
            --bg-gray: #f4f6f8;
            --text-main: #1c1c1c;
            --text-muted: #666666;
            --white: #ffffff;
            --black: #000000;
            --border-color: #e8e8e8;
            --shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .legal-container {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: var(--text-main);
            background-color: var(--bg-gray);
            -webkit-font-smoothing: antialiased;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Header & Navigation */
        header.legal-header {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: var(--primary-green);
            padding: 0.75rem 1rem;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }

        .nav-container {
            max-width: 1100px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        }

        .logo {
            font-size: 1.5rem;
            font-weight: 800;
            text-decoration: none;
            display: flex;
            align-items: center;
            background: transparent;
            padding: 4px 8px;
            border-radius: 6px;
        }

        .logo .bazaar {
            color: var(--black);
        }

        .logo .bolt {
            color: var(--white);
            margin-left: 2px;
        }

        nav.legal-nav {
            margin-left: 1rem;
        }

        nav.legal-nav ul {
            display: flex;
            list-style: none;
            gap: 0.75rem;
            margin: 0;
            padding: 0;
        }

        nav.legal-nav ul li a {
            text-decoration: none;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            font-size: 0.85rem;
            transition: all 0.2s;
            padding: 8px 16px;
            border-radius: 8px;
            white-space: nowrap;
            background: rgba(255, 255, 255, 0.1);
        }

        nav.legal-nav ul li a:hover {
            color: var(--white);
            background-color: rgba(255, 255, 255, 0.2);
        }

        nav.legal-nav ul li a.active {
            background-color: var(--white);
            color: var(--primary-green);
        }

        /* Hero Section */
        .hero {
            background: var(--white);
            padding: 2rem 1.25rem 1.5rem;
            text-align: center;
            border-bottom: 1px solid var(--border-color);
        }

        .hero h1 {
            font-size: clamp(1.75rem, 5vw, 2.5rem);
            font-weight: 800;
            margin-bottom: 0.5rem;
            line-height: 1.1;
            color: var(--primary-green);
        }

        .hero p {
            color: var(--text-muted);
            max-width: 600px;
            margin: 0 auto;
            font-size: clamp(0.85rem, 2.5vw, 0.95rem);
        }

        /* Main Content */
        main.legal-main {
            width: 100%;
            max-width: 900px;
            margin: 1.5rem auto 4rem;
            padding: 0 1rem;
            flex: 1;
        }

        .content-card {
            background: var(--white);
            border-radius: 16px;
            padding: clamp(1.5rem, 6vw, 3.5rem);
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
        }

        /* Section Headings Styling - Underline kept */
        .legal-body h3 {
            font-size: 1.2rem;
            margin: 2rem 0 0.75rem;
            color: var(--black);
            border-left: 5px solid var(--primary-green);
            padding-left: 14px;
            line-height: 1.3;
            font-weight: 700;
            text-align: left;
        }

        .update-date {
            color: var(--text-muted);
            font-size: 0.85rem;
            margin-bottom: 2rem;
            display: inline-block;
            font-weight: 600;
            padding-bottom: 4px;
            border-bottom: 4px solid var(--primary-green);
        }

        .legal-body p {
            margin-bottom: 1rem;
            font-size: 0.95rem;
            color: #333;
            text-align: left;
        }

        .legal-body hr {
            border: 0;
            border-top: 1px solid var(--border-color);
            margin: 1.5rem 0;
        }

        .legal-body ul {
            margin: 0.75rem 0 1.25rem 1.25rem;
            text-align: left;
        }

        .legal-body li {
            margin-bottom: 0.5rem;
            font-size: 0.95rem;
            color: #333;
        }

        .contact-info {
            background: var(--light-green);
            padding: 1.25rem;
            border-radius: 12px;
            margin-top: 2rem;
            border: 2px dashed var(--primary-green);
            word-break: break-all;
            display: inline-block;
        }

        /* Floating Help Button */
        .help-btn {
            position: fixed;
            bottom: 25px;
            right: 25px;
            background-color: var(--black);
            color: white !important;
            padding: 10px 20px;
            border-radius: 50px;
            text-decoration: none !important;
            font-weight: 700;
            font-size: 0.9rem;
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 1001;
            border: none;
        }

        .help-btn:hover {
            transform: translateY(-3px);
            background-color: #222;
        }

        /* Footer */
        footer.legal-footer {
            background: var(--white);
            border-top: 1px solid var(--border-color);
            padding: 3rem 1rem;
            text-align: center;
            margin-top: auto;
        }

        .footer-content p {
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
            color: var(--text-main);
        }

        .footer-email {
            color: var(--primary-green);
            font-weight: 700;
            text-decoration: none;
        }

        .copyright {
            color: var(--text-muted);
            font-size: 0.8rem;
            margin-top: 1rem;
        }

        /* Responsive Logic */
        @media (max-width: 640px) {
            header.legal-header {
                padding: 0.75rem 0.5rem;
            }
            .nav-container {
                flex-direction: column;
                gap: 1rem;
            }
            nav.legal-nav {
                margin-left: 0;
                width: 100%;
            }
            nav.legal-nav ul {
                justify-content: center;
                gap: 0.4rem;
            }
            nav.legal-nav ul li a {
                padding: 8px 12px;
                font-size: 0.75rem;
            }
            .hero {
                padding: 1.5rem 1rem;
            }
            .content-card {
                padding: 1.5rem;
                border-radius: 0;
            }
            .help-btn {
                bottom: 20px;
                right: 20px;
                padding: 8px 16px;
                font-size: 0.8rem;
            }
        }
      ` }} />

      <header className="legal-header">
        <div className="nav-container">
          <Link href="/privacypolicy" className="logo">
            <span className="bazaar">Bazaar</span><span className="bolt">Bolt</span>
          </Link>
          <nav className="legal-nav">
            <ul>
              <li>
                <Link href="/privacypolicy" className={pathname === "/privacypolicy" ? "active" : ""}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={pathname === "/terms" ? "active" : ""}>
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="hero">
        <h1>Terms & Conditions</h1>
        <p>Welcome to BazaarBolt. Please read our service agreement and usage rules carefully.</p>
      </div>

      <main className="legal-main">
        <div className="page-view active">
          <article className="content-card">
            <span className="update-date">Last Updated: April 2026</span>
            
            <div className="legal-body">
              <p>Welcome to BazaarBolt. These Terms and Conditions ("Terms") govern your access to and use of the BazaarBolt mobile application, website, and services (collectively referred to as the “Platform”).</p>
              <p>By accessing or using BazaarBolt, you agree to be legally bound by these Terms and our Privacy Policy. If you do not agree, you must not use the Platform.</p>

              <hr />

              <h3>1. DEFINITIONS</h3>
              <ul>
                <li><strong>BazaarBolt / We / Us / Our:</strong> Refers to the BazaarBolt platform and its operators</li>
                <li><strong>User / Customer / You:</strong> Any person using the Platform</li>
                <li><strong>Services:</strong> Grocery ordering, delivery, notifications, and related features</li>
                <li><strong>Rider:</strong> Independent delivery partner</li>
                <li><strong>Platform:</strong> Mobile app, website, and related services</li>
              </ul>

              <h3>2. ACCEPTANCE OF TERMS</h3>
              <p>By using BazaarBolt:</p>
              <ul>
                <li>You confirm that you are legally capable of entering into a contract</li>
                <li>You agree to comply with these Terms and all applicable laws</li>
                <li>These Terms form a legally binding agreement</li>
              </ul>
              <p>We may update these Terms at any time. Continued use = acceptance.</p>

              <h3>3. ELIGIBILITY</h3>
              <p>To use BazaarBolt:</p>
              <ul>
                <li>You must be at least 18 years old</li>
                <li>You must provide accurate information</li>
                <li>You must use services for personal use only</li>
              </ul>

              <h3>4. ACCOUNT REGISTRATION</h3>
              <p>To place orders, account creation is required. You must provide Name, Phone number, and Address. You are responsible for account confidentiality and all activities under your account.</p>

              <h3>5. SERVICES OVERVIEW</h3>
              <p>BazaarBolt provides grocery delivery services, product browsing, and order tracking. We act as a technology platform connecting customers and delivery partners.</p>

              <h3>6. USER RESPONSIBILITIES</h3>
              <p>You agree to provide accurate delivery details, be available at delivery time, and treat riders respectfully. You must NOT place fake orders or attempt fraud.</p>

              <h3>7. PROHIBITED USE</h3>
              <p>You must not hack, upload harmful content, or use automation. BazaarBolt reserves full rights to suspend accounts or take legal action.</p>

              <h3>8. PLATFORM ACCESS</h3>
              <p>You are granted limited, non-exclusive access. You cannot copy content, resell services, or reverse engineer the app.</p>

              <h3>9. COMMUNICATION CONSENT</h3>
              <p>By using BazaarBolt, you agree to receive order updates, delivery notifications, and promotional messages.</p>

              <h3>10. ORDER PLACEMENT</h3>
              <p>Orders are confirmed after checkout. BazaarBolt may cancel orders due to product unavailability or technical issues.</p>

              <h3>11. PAYMENT POLICY</h3>
              <p><strong>Only Cash on Delivery (COD) is accepted.</strong> Pay only the amount shown in the app. Do NOT pay extra to riders.</p>

              <h3>12. DELIVERY POLICY</h3>
              <p>Delivery will occur within selected time slots. BazaarBolt is not liable for minor delays due to traffic or weather.</p>

              <h3>13. ADDRESS MODIFICATION</h3>
              <p>Address can be changed before dispatch only. After dispatch, no changes are allowed.</p>

              <h3>14. CANCELLATION POLICY</h3>
              <p>Orders can be cancelled before rider acceptance only. After rider accepts, cancellation is not allowed.</p>

              <h3>15. NO RETURN POLICY</h3>
              <p>All products are non-returnable. Exceptions for damaged items are subject to review.</p>

              <h3>16. ISSUE RESOLUTION</h3>
              <p>For issues: 📧 bazaarbolt.support@gmail.com. Resolution within 24 hours.</p>

              <h3>17. REFUND POLICY</h3>
              <p>Refunds are not guaranteed. If approved, processed within 2–4 business days.</p>

              <h3>18. DELIVERY RESPONSIBILITY</h3>
              <p>Customer must be available at delivery location. If not, the order may be cancelled without refund.</p>

              <h3>19. RIDER POLICY</h3>
              <p>Riders are independent service providers, not employees. Misconduct toward riders leads to account suspension.</p>

              <h3>20. PRICING & CHARGES</h3>
              <p>Final price includes product cost, delivery charges, and platform fees as shown at checkout.</p>

              <h3>21. DATA & PRIVACY</h3>
              <p>We collect name, phone, and address for order processing and notifications as per our Privacy Policy.</p>

              <h3>22. PUSH NOTIFICATIONS</h3>
              <p>You consent to order alerts and system updates. You can disable them anytime in settings.</p>

              <h3>23. DISCLAIMER</h3>
              <p>Services are provided “as is”. We do not guarantee error-free operation.</p>

              <h3>24. LIMITATION OF LIABILITY</h3>
              <p>BazaarBolt is not liable for app crashes or delivery delays. Maximum liability = order value only.</p>

              <h3>25. INTELLECTUAL PROPERTY</h3>
              <p>All content (logo, design, UI) belongs to BazaarBolt. Unauthorized use is prohibited.</p>

              <h3>26. TERMINATION</h3>
              <p>We may suspend accounts for Terms violations or detected fraud.</p>

              <h3>27. FORCE MAJEURE</h3>
              <p>We are not responsible for delays caused by natural disasters or government restrictions.</p>

              <h3>28. GOVERNING LAW</h3>
              <p>Governed by Indian law. Jurisdiction: India courts.</p>

              <h3>29. MODIFICATIONS</h3>
              <p>We may update Terms anytime. Continued use = acceptance.</p>

              <h3>30. CONTACT INFORMATION</h3>
              <div className="contact-info">
                📧 Email: <strong>bazaarbolt.support@gmail.com</strong>
              </div>

              <hr />
              <p style={{ fontWeight: 700, textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                ✔ Accept all Terms &nbsp; | &nbsp; ✔ Follow all policies &nbsp; | &nbsp; ✔ Use services responsibly
              </p>
            </div>
          </article>
        </div>
      </main>

      <a href="mailto:bazaarbolt.support@gmail.com" className="help-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span>Need Help?</span>
      </a>

      <footer className="legal-footer">
        <div className="footer-content">
          <p>Questions? Reach out to us at <a href="mailto:bazaarbolt.support@gmail.com" className="footer-email">bazaarbolt.support@gmail.com</a></p>
          <p className="copyright">&copy; 2026 BazaarBolt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

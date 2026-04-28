"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PrivacyPolicyPage() {
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
        <h1>Privacy Policy</h1>
        <p>Your privacy and safety are our top priorities. Please review our latest policies below.</p>
      </div>

      <main className="legal-main">
        <div className="page-view active">
          <article className="content-card">
            <span className="update-date">Last Updated: April 2026</span>
            
            <div className="legal-body">
              <p>BazaarBolt ("Company", "we", "our", or "us") is committed to safeguarding the privacy and security of your personal information. Your privacy is extremely important to us, and we strive to ensure transparency, accountability, and protection in how your data is handled.</p>
              <p>This Privacy Policy explains how we collect, use, process, store, disclose, and protect your information when you use our mobile application, website, and services (collectively referred to as the "Services").</p>
              <p>By accessing or using BazaarBolt, you agree to the terms of this Privacy Policy along with our Terms & Conditions.</p>

              <hr />

              <h3>1. Applicability and Scope</h3>
              <p>This Privacy Policy applies to all users of BazaarBolt services, including individuals who access our platform via mobile devices, web applications, or any other digital interface.</p>
              <p>This policy governs:</p>
              <ul>
                <li>Data collected directly from users</li>
                <li>Data collected automatically through the platform</li>
                <li>Data collected via integrated third-party services</li>
              </ul>
              <p>This policy does not apply to third-party platforms or services that operate independently and have their own privacy policies.</p>

              <hr />

              <h3>2. Types of Information We Collect</h3>
              <p>We collect various types of information to provide and improve our services:</p>

              <h3>2.1 Personal Information</h3>
              <ul>
                <li>Full name</li>
                <li>Mobile phone number</li>
                <li>Email address</li>
                <li>Delivery address</li>
              </ul>

              <h3>2.2 Account Information</h3>
              <ul>
                <li>Login credentials (secured via authentication systems such as Firebase)</li>
                <li>User preferences and settings</li>
              </ul>

              <h3>2.3 Transaction & Order Information</h3>
              <ul>
                <li>Order history</li>
                <li>Product selections</li>
                <li>Delivery instructions</li>
                <li>Billing-related information (COD only)</li>
              </ul>

              <h3>2.4 Device and Technical Information</h3>
              <ul>
                <li>Device type and model</li>
                <li>Operating system and version</li>
                <li>IP address</li>
                <li>Browser type</li>
                <li>App usage patterns</li>
                <li>Error logs and crash reports</li>
              </ul>

              <h3>2.5 Location Data</h3>
              <ul>
                <li>Real-time or approximate location (used for delivery coordination)</li>
                <li>Location is collected only with user permission</li>
              </ul>

              <h3>2.6 Communication Data</h3>
              <ul>
                <li>Interactions with customer support</li>
                <li>Emails, feedback, and complaints</li>
                <li>Notifications and responses</li>
              </ul>

              <h3>2.7 Notification & Token Data</h3>
              <ul>
                <li>Device tokens used for push notifications</li>
                <li>Notification interaction data</li>
              </ul>

              <hr />

              <h3>3. How We Collect Information</h3>
              <p>We collect information through:</p>
              <h3>3.1 Direct Collection</h3>
              <ul>
                <li>When you register or create an account</li>
                <li>When you place an order</li>
                <li>When you contact support</li>
              </ul>
              <h3>3.2 Automatic Collection</h3>
              <ul>
                <li>Through app usage</li>
                <li>Through device and analytics data</li>
                <li>Through cookies or similar technologies (if web is used)</li>
              </ul>
              <h3>3.3 Third-Party Integrations</h3>
              <ul>
                <li>Firebase (authentication, notifications)</li>
                <li>Hosting services</li>
                <li>Analytics tools</li>
              </ul>

              <hr />

              <h3>4. Purpose of Data Collection</h3>
              <ul>
                <li>To process and fulfill orders</li>
                <li>To assign delivery personnel (riders)</li>
                <li>To provide real-time order tracking</li>
                <li>To send notifications (order updates, delivery alerts)</li>
                <li>To improve app performance and user experience</li>
                <li>To resolve disputes and provide customer support</li>
                <li>To detect and prevent fraud or misuse</li>
                <li>To comply with legal obligations</li>
              </ul>

              <hr />

              <h3>5. Payment Policy (Important)</h3>
              <ul>
                <li>BazaarBolt operates on <strong>Cash on Delivery (COD) only</strong></li>
                <li>We do NOT collect, store, or process any online payment details</li>
                <li>Customers must pay <strong>only the amount displayed at checkout</strong></li>
                <li>No additional payment should be made to delivery personnel</li>
              </ul>

              <hr />

              <h3>6. Data Sharing and Disclosure</h3>
              <p>We respect your privacy and do not sell your personal data.</p>
              <p>We may share your data only in the following cases:</p>
              <h3>6.1 Service Execution</h3>
              <ul>
                <li>With delivery riders (only necessary delivery information)</li>
              </ul>
              <h3>6.2 Service Providers</h3>
              <ul>
                <li>Firebase (authentication and notifications)</li>
                <li>Hosting platforms (e.g., Vercel)</li>
              </ul>
              <h3>6.3 Legal Compliance</h3>
              <ul>
                <li>When required by law, government authorities, or legal processes</li>
              </ul>
              <h3>6.4 Business Protection</h3>
              <ul>
                <li>To prevent fraud, misuse, or security threats</li>
              </ul>

              <hr />

              <h3>7. Data Security Measures</h3>
              <ul>
                <li>Encrypted communication (HTTPS)</li>
                <li>Secure authentication systems</li>
                <li>Access control mechanisms</li>
                <li>Regular monitoring and security checks</li>
              </ul>

              <hr />

              <h3>8. Data Retention Policy</h3>
              <ul>
                <li>To provide services</li>
                <li>To comply with legal obligations</li>
                <li>To resolve disputes</li>
              </ul>

              <hr />

              <h3>9. Notifications and Communication</h3>
              <ul>
                <li>Order confirmations</li>
                <li>Delivery updates</li>
                <li>Service-related alerts</li>
              </ul>

              <hr />

              <h3>10. User Rights</h3>
              <ul>
                <li>Access your personal information</li>
                <li>Update or correct your data</li>
                <li>Request deletion of your account</li>
              </ul>
              <p>To exercise these rights, contact us at: 📧 <strong>bazaarbolt.support@gmail.com</strong></p>

              <hr />

              <h3>11. Children's Privacy</h3>
              <p>Our services are not intended for users below 13 years of age.</p>

              <hr />

              <h3>12. Third-Party Links</h3>
              <p>We are not responsible for third-party privacy practices.</p>

              <hr />

              <h3>13. Policy Updates</h3>
              <p>Changes will be posted within the app and updated with a new “Last Updated” date.</p>

              <hr />

              <h3>14. Limitation of Liability</h3>
              <ul>
                <li>Data breaches caused by external attacks</li>
                <li>User negligence</li>
                <li>Technical failures beyond our control</li>
              </ul>

              <hr />

              <h3>15. Contact Information</h3>
              <div className="contact-info">
                📧 Email: <strong>bazaarbolt.support@gmail.com</strong>
              </div>
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

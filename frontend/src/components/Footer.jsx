import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <Link to="/" className="logo">Know<span>Your</span>Career</Link>
        <p>Semantic resume matching, job recommendations and market insights, all in one place.</p>
      </div>
      <div className="footer-cards">
        <a className="fcard f-blue" href="mailto:knowyourcareer@gmail.com">
          <span className="f-icon">📧</span><small>Email us</small><b>knowyourcareer@gmail.com</b>
        </a>
        <div className="fcard f-pink">
          <span className="f-icon">📞</span><small>Call us</small><b>+91 XXXXXXXXXX</b>
        </div>
        <div className="fcard f-purple">
          <span className="f-icon">📍</span><small>Find us</small><b>India</b>
        </div>
      </div>
      <small>© {new Date().getFullYear()} Know Your Career. All rights reserved.</small>
    </footer>
  );
}

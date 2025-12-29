const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>Scrum Dealer</h4>
          <p>Smart Project Planning with Scrum and PERT</p>
        </div>
        
        <div className="footer-section">
          <h4>Developer</h4>
          <p>Created with a strong passion by <strong>Malak Al Ammari</strong></p>
          <div className="developer-links">
            <a href="https://github.com/alammarimalak" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/malak-al-ammari-7a5471243/" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <a href="mailto:alammarimalak17@gmail.com">
              Contact
            </a>
          </div>
        </div>
        
        <div className="footer-section">
          <h4>Legal</h4>
          <p>© {currentYear} Scrum Dealer. All rights reserved.</p>
          <p>Made with Reactjs, D3.js, jsPDF & html2canva</p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>Built for efficient project planning and task scheduling</p>
      </div>
    </footer>
  );
};

export default Footer;
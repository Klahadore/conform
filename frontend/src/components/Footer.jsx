import { scrollToTop } from '../utils/scrollUtils';

// Update link click handlers
const handleLinkClick = (e, path) => {
  e.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  scrollToTop();
};

// Then in your JSX:
<a 
  href="/" 
  onClick={(e) => handleLinkClick(e, '/')}
>
  Home
</a> 
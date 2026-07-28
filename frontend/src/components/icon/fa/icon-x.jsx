import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons'; // Font Awesome 6 uses faXTwitter for the X icon

const IconX = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faXTwitter} className={className} {...props} />;
};

export default IconX;

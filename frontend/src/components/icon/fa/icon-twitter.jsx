import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';

const IconTwitter = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faTwitter} className={className} {...props} />;
};

export default IconTwitter;

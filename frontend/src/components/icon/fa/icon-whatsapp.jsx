import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

const IconWhatsapp = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faWhatsapp} className={className} {...props} />;
};

export default IconWhatsapp;

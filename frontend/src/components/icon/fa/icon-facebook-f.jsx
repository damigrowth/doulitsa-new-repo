import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebookF } from '@fortawesome/free-brands-svg-icons';

const IconFacebookF = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faFacebookF} className={className} {...props} />
  );
};

export default IconFacebookF;

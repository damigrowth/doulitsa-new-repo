import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLinkedinIn } from '@fortawesome/free-brands-svg-icons';

const IconLinkedinIn = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faLinkedinIn} className={className} {...props} />
  );
};

export default IconLinkedinIn;

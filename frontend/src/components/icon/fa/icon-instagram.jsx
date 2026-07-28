import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram } from '@fortawesome/free-brands-svg-icons';

const IconInstagram = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faInstagram} className={className} {...props} />
  );
};

export default IconInstagram;

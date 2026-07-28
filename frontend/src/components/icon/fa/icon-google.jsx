import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

const IconGoogle = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faGoogle} className={className} {...props} />;
};

export default IconGoogle;

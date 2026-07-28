import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faViber } from '@fortawesome/free-brands-svg-icons';

const IconViber = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faViber} className={className} {...props} />;
};

export default IconViber;

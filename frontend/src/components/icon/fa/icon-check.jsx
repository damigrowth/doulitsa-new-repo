import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

const IconCheck = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faCheck} className={className} {...props} />;
};

export default IconCheck;

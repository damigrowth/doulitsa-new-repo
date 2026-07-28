import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey } from '@fortawesome/free-solid-svg-icons';

const IconKey = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faKey} className={className} {...props} />;
};

export default IconKey;

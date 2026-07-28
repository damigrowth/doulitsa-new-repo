import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';

const IconFlag = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faFlag} className={className} {...props} />;
};

export default IconFlag;

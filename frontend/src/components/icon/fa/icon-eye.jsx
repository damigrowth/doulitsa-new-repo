import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';

const IconEye = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faEye} className={className} {...props} />;
};

export default IconEye;

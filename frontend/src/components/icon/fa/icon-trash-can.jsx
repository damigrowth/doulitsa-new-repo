import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';

const IconTrashCan = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faTrashCan} className={className} {...props} />;
};

export default IconTrashCan;

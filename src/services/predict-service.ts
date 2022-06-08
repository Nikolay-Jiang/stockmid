import predictRepo from '@repos/predict-repo';
import { t_Predict } from '@prisma/client'



/**
 * Add one predict.
 * 
 * @param predict 
 * @returns 
 */
function addOne(predict: t_Predict): Promise<void> {
    return predictRepo.add(predict);
}



async function getPredictByPredictTime(startdate: Date, enddate: Date): Promise<t_Predict[]> {
    const predicts = await predictRepo.getAllbyPredictTime(startdate, enddate);
    return predicts
}



// Export default
export default {
    getPredictByPredictTime,
    addOne,

} as const;


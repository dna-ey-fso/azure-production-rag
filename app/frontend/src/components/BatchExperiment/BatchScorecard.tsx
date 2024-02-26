import styles from "./BatchExperiment.module.css";

interface Props {
    experimentName: string;
    summ: any;
}
const BatchScorecard = ({ experimentName, summ }: Props) => {
    const groundedness = summ.groundedness.mean_rating;
    const relevance = summ.relevance.mean_rating;
    const coherence = summ.coherence.mean_rating;
    const latency = summ.latency.mean;
    const answer_length = summ.answer_length.mean;
    // const answer_has_citation = summ.answer_has_citation.rate;

    return (
        <div className={styles.batchScorecard}>
            <div className={styles.batchScorecardHeader}>
                <h1>{experimentName}</h1>
            </div>
            <div className={styles.batchScorecardContent}>
                <div className={styles.metricGridElem}>
                    <span>Groundedness</span>
                    {groundedness}
                </div>
                <div className={styles.metricGridElem}>
                    <span>Relevance</span>
                    {relevance}
                </div>
                <div className={styles.metricGridElem}>
                    <span>Coherence</span>
                    {coherence}
                </div>
                <div className={styles.metricGridElem}>
                    <span>Similarity</span>
                    {latency}
                </div>
                <div className={styles.metricGridElem}>
                    <span>Answer Length</span>
                    {answer_length}
                </div>
                {/* <div className={styles.metricGridElem}>
                    <span>Citation Rate</span>
                    {answer_has_citation}
                </div> */}
            </div>
        </div>
    );
};
export default BatchScorecard;

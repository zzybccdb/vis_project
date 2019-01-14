<template>
	<v-container px-0 style="margin:0; max-width:1920px; padding-top:0">
		<v-layout row wrap>
		<!-- <v-flex xs12>
			<box-plot 
			title='Importance of each dimension (Compare with ground truth)' 
			api-url='/analysis/dim_importance'></box-plot>
		</v-flex> -->
		<v-flex xs12>
			<box-plot 
			title='Reconstruction error rate for each dimension' 
			api-url='/analysis/dim_reconstruct'></box-plot>
		</v-flex>
		</v-layout>
	</v-container>
</template>

<script>
import BoxPlot from '@/components/BoxPlot.vue'
export default {
	components: {
		BoxPlot
	},
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>

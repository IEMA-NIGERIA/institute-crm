<template>
        <FormWrapper
            :label="fieldLabel"
            :required="required"
        >
        
            <MdEditor 
                :value="content" 
                @onChange="emits('update:content', $event)"
                language="en-US" 
                v-on:on-upload-img="handleImageUpload"
            />
        </FormWrapper>
</template>
<script setup="" lang="ts">
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';

interface IMarkdownProps {
    fieldLabel?:string
    required?: boolean
    content?: string
}
const props = withDefaults(defineProps<IMarkdownProps>(),{
    content:""
})

const handleImageUpload = () =>{}

const emits = defineEmits(["update:content"])

</script>